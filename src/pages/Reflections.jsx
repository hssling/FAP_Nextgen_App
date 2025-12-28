import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Save, Star, Sparkles, X, MessageCircle,
    Upload, FileText, CheckCircle, ChevronRight, ChevronLeft,
    Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// Gibbs Cycle Stages Configuration
const GIBBS_STAGES = [
    { id: 'description', title: 'Description', prompt: 'What happened? Describe the event objectively.', badge: 'bg-blue-100 text-blue-800' },
    { id: 'feelings', title: 'Feelings', prompt: 'What were you thinking and feeling?', badge: 'bg-purple-100 text-purple-800' },
    { id: 'evaluation', title: 'Evaluation', prompt: 'What was good and bad about the experience?', badge: 'bg-orange-100 text-orange-800' },
    { id: 'analysis', title: 'Analysis', prompt: 'Why did it happen? What sense can you make of it?', badge: 'bg-green-100 text-green-800' },
    { id: 'conclusion', title: 'Conclusion', prompt: 'What else could you have done? What did you learn?', badge: 'bg-yellow-100 text-yellow-800' },
    { id: 'actionPlan', title: 'Action Plan', prompt: 'If it arose again, what would you do?', badge: 'bg-red-100 text-red-800' }
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

    const getScoreColor = (score) => {
        if (score >= 9) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (score >= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (score >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 px-4">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-slate-800">Reflective Journal</h1>
                <p className="text-slate-500 mt-2">Document your journey using the Gibbs Reflective Cycle.</p>
            </motion.header>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: Input Area */}
                <motion.div
                    className="lg:col-span-7"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
                        {/* Phase & Family Selectors */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phase</label>
                                <select
                                    className="w-full p-2 rounded-lg border-slate-300 border text-sm"
                                    value={formData.phase}
                                    onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                >
                                    <option>Phase I</option>
                                    <option>Phase II</option>
                                    <option>Phase III</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Linked Family</label>
                                <select
                                    className="w-full p-2 rounded-lg border-slate-300 border text-sm"
                                    value={formData.familyId}
                                    onChange={e => setFormData({ ...formData, familyId: e.target.value })}
                                >
                                    <option value="">-- General Reflection --</option>
                                    {families.map(f => <option key={f.id} value={f.id}>{f.head_name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Mode Toggles */}
                        <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => setActiveTab('write')}
                                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'write' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <BookOpen size={16} /> Structured Entry
                            </button>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Upload size={16} /> Upload File
                            </button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="p-6">
                            {activeTab === 'write' ? (
                                <div>
                                    {/* Stepper Progress */}
                                    <div className="flex justify-between mb-6 relative">
                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>
                                        {GIBBS_STAGES.map((stage, idx) => (
                                            <button
                                                key={stage.id}
                                                onClick={() => setCurrentStage(idx)}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${idx === currentStage ? 'bg-blue-600 text-white shadow-lg scale-110' :
                                                        idx < currentStage ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                                                    }`}
                                            >
                                                {idx < currentStage ? <CheckCircle size={14} /> : idx + 1}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Active Stage Input */}
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStage}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="min-h-[300px]"
                                        >
                                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-2 ${GIBBS_STAGES[currentStage].badge}`}>
                                                Step {currentStage + 1}: {GIBBS_STAGES[currentStage].title}
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-1">{GIBBS_STAGES[currentStage].prompt}</h3>
                                            <p className="text-sm text-slate-500 mb-4">Be specific and honest. Use 'I' statements.</p>

                                            <textarea
                                                className="w-full h-48 p-4 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none text-slate-700 leading-relaxed"
                                                placeholder={`Type your ${GIBBS_STAGES[currentStage].title.toLowerCase()} here...`}
                                                value={formData.gibbs[GIBBS_STAGES[currentStage].id]}
                                                onChange={(e) => handleGibbsChange(GIBBS_STAGES[currentStage].id, e.target.value)}
                                            />
                                        </motion.div>
                                    </AnimatePresence>

                                    {/* Navigation Buttons */}
                                    <div className="flex justify-between mt-6 pt-6 border-t border-slate-100">
                                        <button
                                            onClick={() => setCurrentStage(p => Math.max(0, p - 1))}
                                            disabled={currentStage === 0}
                                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2 font-medium"
                                        >
                                            <ChevronLeft size={16} /> Previous
                                        </button>

                                        {currentStage < GIBBS_STAGES.length - 1 ? (
                                            <button
                                                onClick={() => setCurrentStage(p => Math.min(GIBBS_STAGES.length - 1, p + 1))}
                                                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-medium"
                                            >
                                                Next Step <ChevronRight size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md shadow-blue-200"
                                            >
                                                {submitting ? 'Saving...' : <><Save size={18} /> Complete & Save</>}
                                            </button>
                                        )}
                                    </div>

                                    {/* AI Coach Button */}
                                    <div className="mt-4 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={handleAICoach}
                                            disabled={isAnalyzing}
                                            className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-2 transition-colors px-4 py-2 hover:bg-amber-50 rounded-full"
                                        >
                                            <Sparkles size={16} /> {isAnalyzing ? "Analyzing Reflection..." : "Ask AI Coach for Tips"}
                                        </button>
                                    </div>

                                    {aiFeedback && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800 flex items-start gap-3">
                                            <Sparkles className="shrink-0 mt-0.5 text-indigo-600" size={16} />
                                            <div>{aiFeedback}</div>
                                            <button onClick={() => setAiFeedback(null)} className="ml-auto text-indigo-400 hover:text-indigo-600"><X size={16} /></button>
                                        </motion.div>
                                    )}

                                </div>
                            ) : (
                                <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                    />

                                    {selectedFile ? (
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                                                <FileText size={32} />
                                            </div>
                                            <p className="font-medium text-slate-800 truncate">{selectedFile.name}</p>
                                            <p className="text-sm text-slate-500 mb-4">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>

                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => setSelectedFile(null)}
                                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                                                >
                                                    Remove
                                                </button>
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={submitting}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                                >
                                                    {submitting ? 'Uploading...' : 'Upload Reflection'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <Upload size={32} />
                                            </div>
                                            <h3 className="font-semibold text-slate-700 mb-1">Click to upload document</h3>
                                            <p className="text-sm text-slate-400">PDF, DOCX up to 10MB</p>
                                        </div>
                                    )}

                                    {/* Brief summary for file upload */}
                                    <div className="mt-8 text-left border-t pt-6">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Brief Summary (Optional)</label>
                                        <textarea
                                            className="w-full p-3 border rounded-lg text-sm"
                                            rows={3}
                                            placeholder="What is this reflection about?"
                                            value={formData.gibbs.description}
                                            onChange={e => handleGibbsChange('description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT COLUMN: History */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-slate-800">Your Journal</h2>
                        <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{reflections.length} Entries</span>
                    </div>

                    <div className="h-[calc(100vh-200px)] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {loading ? <div className="text-center py-8 text-slate-400">Loading entries...</div> : reflections.length === 0 ? (
                            <div className="text-center py-8 px-6 border border-dashed rounded-xl bg-slate-50">
                                <BookOpen className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-slate-500">No reflections yet. Start your first entry!</p>
                            </div>
                        ) : (
                            reflections.map((ref, idx) => (
                                <motion.div
                                    key={ref.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative"
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{ref.phase}</span>
                                                {ref.reflection_type === 'file' && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1"><Paperclip size={10} /> File</span>}
                                            </div>
                                            <h4 className="font-medium text-slate-800 text-sm line-clamp-1">
                                                {ref.gibbs_description ? ref.gibbs_description.substring(0, 50) + "..." : "Reflection Entry"}
                                            </h4>
                                        </div>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(ref.created_at).toLocaleDateString()}</span>
                                    </div>

                                    {/* Preview Body */}
                                    <div className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                                        {ref.content || ref.gibbs_analysis || "No content preview available."}
                                    </div>

                                    {/* Grade Badge */}
                                    {ref.status === 'Graded' && (
                                        <div className={`mt-3 p-3 rounded-lg border flex justify-between items-center ${getScoreColor(ref.total_score || 0)}`}>
                                            <div className="flex items-center gap-2">
                                                <Star size={16} fill="currentColor" />
                                                <span className="font-bold">Grade: {ref.grade || 'N/A'}</span>
                                            </div>
                                            <span className="text-xs font-medium px-2 py-0.5 bg-white/50 rounded-full">
                                                {ref.total_score ? `${ref.total_score}/10` : 'Graded'}
                                            </span>
                                        </div>
                                    )}

                                    {/* File Download Link */}
                                    {ref.file_url && (
                                        <a
                                            href={ref.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 block text-center w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                                        >
                                            View Attached File
                                        </a>
                                    )}

                                    {/* Feedback Preview */}
                                    {ref.teacher_feedback && (
                                        <div className="mt-3 text-xs bg-green-50 text-green-800 p-2 rounded-lg border border-green-100">
                                            <span className="font-bold block mb-1 flex items-center gap-1"><MessageCircle size={10} /> Mentor Feedback:</span>
                                            {ref.teacher_feedback}
                                        </div>
                                    )}

                                    {/* Status Pill */}
                                    <div className="absolute top-5 right-5">
                                        {ref.status === 'Pending' && <div className="w-2 h-2 bg-amber-400 rounded-full"></div>}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
            `}</style>
        </div>
    );
};

export default Reflections;
