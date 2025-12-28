import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Save, Sparkles, X,
    Upload, FileText, CheckCircle, ChevronRight, ChevronLeft,
    Paperclip, Download, Plus, Calendar, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// --- Configuration ---
const GIBBS_STAGES = [
    { id: 'description', title: 'Description', prompt: 'What happened?', color: 'from-blue-500 to-cyan-500', icon: '📝' },
    { id: 'feelings', title: 'Feelings', prompt: 'What were you thinking & feeling?', color: 'from-purple-500 to-pink-500', icon: '💭' },
    { id: 'evaluation', title: 'Evaluation', prompt: 'What was good & bad about it?', color: 'from-amber-500 to-orange-500', icon: '⚖️' },
    { id: 'analysis', title: 'Analysis', prompt: 'What sense can you make of the situation?', color: 'from-emerald-500 to-teal-500', icon: '🔬' },
    { id: 'conclusion', title: 'Conclusion', prompt: 'What else could you have done?', color: 'from-indigo-500 to-blue-600', icon: '💡' },
    { id: 'actionPlan', title: 'Action Plan', prompt: 'If it arose again, what would you do?', color: 'from-rose-500 to-red-600', icon: '🚀' }
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

    // --- Components ---
    const StatCard = ({ icon: Icon, label, value, color }) => (
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} text-white shadow-md`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-extrabold text-slate-800">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Ambient Background globs */}
            <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-200/30 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-3xl -z-10" />

            {/* --- Main Content --- */}
            <div className="max-w-5xl mx-auto px-6 py-12">

                {/* Header Section */}
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Journal</h1>
                        <p className="text-slate-500 font-medium text-lg">Your professional growth journey.</p>
                    </div>
                    <button
                        onClick={() => setIsWriting(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> New Entry
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <StatCard icon={BookOpen} label="Total Entries" value={reflections.length} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
                    <StatCard icon={TrendingUp} label="Avg. Score" value={reflections.filter(r => r.total_score).reduce((acc, curr) => acc + curr.total_score, 0) / (reflections.filter(r => r.total_score).length || 1) || '-'} color="bg-gradient-to-br from-emerald-400 to-teal-500" />
                    <StatCard icon={Calendar} label="This Month" value={reflections.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length} color="bg-gradient-to-br from-orange-400 to-pink-500" />
                </div>

                {/* Entries Stream */}
                <div className="space-y-8">
                    {loading ? <p className="text-center text-slate-400">Loading your journey...</p> :
                        reflections.length === 0 ? (
                            <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <FileText size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700">Canvas is Empty</h3>
                                <button onClick={() => setIsWriting(true)} className="text-blue-600 font-bold hover:underline mt-2">Create your first reflection</button>
                            </div>
                        ) :
                            reflections.map((ref) => (
                                <motion.div
                                    key={ref.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="group bg-white rounded-[2rem] p-1 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100"
                                >
                                    <div className="bg-white rounded-[1.8rem] p-8 relative overflow-hidden">
                                        {/* Decorative Gradient Side */}
                                        <div className={`absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b ${ref.grade === 'A' ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-indigo-500'}`} />

                                        <div className="flex justify-between items-start mb-6 pl-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-black text-slate-900 leading-none">{new Date(ref.created_at).getDate()}</span>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(ref.created_at).toLocaleString('default', { month: 'short' })}</span>
                                                </div>
                                                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                                                <div>
                                                    <span className="block text-sm font-bold text-slate-800">{ref.phase}</span>
                                                    <span className="block text-xs font-medium text-slate-500">{ref.families?.head_name || 'General Reflection'}</span>
                                                </div>
                                            </div>
                                            {ref.status === 'Graded' && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-800 to-slate-600">{ref.grade}</span>
                                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wide">Graded</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pl-4">
                                            <h3 className="text-xl font-bold text-slate-800 mb-3 leading-snug">
                                                {ref.gibbs_description ? "Reflection on " + ref.gibbs_description.substring(0, 50) + "..." : ref.file_name || "Journal Entry"}
                                            </h3>

                                            {ref.gibbs_analysis && (
                                                <p className="text-slate-600 leading-relaxed mb-6 font-medium border-l-2 border-slate-100 pl-4 italic">
                                                    "{ref.gibbs_analysis}"
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                                                <div className="flex gap-2">
                                                    {/* Tags/Chips could go here */}
                                                    {ref.reflection_type === 'file' && <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1"><Paperclip size={12} /> Attachment</span>}
                                                </div>
                                                {ref.file_url ? (
                                                    <a href={ref.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
                                                        Download <Download size={16} />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-300">Read Full Entry &rarr;</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                    }
                </div>
            </div>

            {/* --- WRITING MODAL (The "Focus" Experience) --- */}
            <AnimatePresence>
                {isWriting && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
                            className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col md:flex-row"
                        >
                            {/* Left: Progression & Context */}
                            <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-black text-slate-800 mb-1">New Reflection</h2>
                                    <p className="text-sm text-slate-500 font-medium">Follow the cycle to reflect deeply.</p>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                                    {GIBBS_STAGES.map((stage, idx) => (
                                        <div
                                            key={stage.id}
                                            onClick={() => setCurrentStage(idx)}
                                            className={`relative pl-8 cursor-pointer transition-all duration-300 ${currentStage === idx ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                                        >
                                            {/* Timeline dot */}
                                            <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 bg-white transition-colors ${currentStage === idx ? 'border-blue-600 scale-125' : 'border-slate-300'}`}>
                                                {currentStage > idx && <div className="absolute inset-0 bg-emerald-500 rounded-full" />}
                                            </div>
                                            {/* Timeline Line */}
                                            {idx !== GIBBS_STAGES.length - 1 && <div className="absolute left-[7px] top-6 bottom-[-24px] w-0.5 bg-slate-200" />}

                                            <h4 className={`text-sm font-bold ${currentStage === idx ? 'text-blue-900' : 'text-slate-600'}`}>{stage.title}</h4>
                                            {currentStage === idx && <p className="text-xs text-blue-600 font-medium animate-in slide-in-from-left-2 mt-1">{stage.prompt}</p>}
                                        </div>
                                    ))}
                                </div>

                                {/* Context Selectors */}
                                <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400">Phase</label>
                                        <select
                                            value={formData.phase} onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                            className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-100 outline-none"
                                        >
                                            <option>Phase I</option><option>Phase II</option><option>Phase III</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400">Family Context (Optional)</label>
                                        <select
                                            value={formData.familyId} onChange={e => setFormData({ ...formData, familyId: e.target.value })}
                                            className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-100 outline-none"
                                        >
                                            <option value="">-- General --</option>
                                            {families.map(f => <option key={f.id} value={f.id}>{f.head_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Input Area */}
                            <div className="flex-1 flex flex-col bg-white relative">
                                <button onClick={() => setIsWriting(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors z-10"><X size={20} /></button>

                                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStage}
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="h-full flex flex-col"
                                        >
                                            <div className="flex items-center gap-3 mb-6">
                                                <span className="text-4xl">{GIBBS_STAGES[currentStage].icon}</span>
                                                <h3 className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${GIBBS_STAGES[currentStage].color}`}>
                                                    {GIBBS_STAGES[currentStage].title}
                                                </h3>
                                            </div>

                                            <textarea
                                                className="w-full flex-1 text-lg font-medium text-slate-700 placeholder:text-slate-300 resize-none outline-none leading-relaxed"
                                                placeholder={GIBBS_STAGES[currentStage].prompt + " Type freely..."}
                                                value={formData.gibbs[GIBBS_STAGES[currentStage].id]}
                                                onChange={e => setFormData(prev => ({ ...prev, gibbs: { ...prev.gibbs, [GIBBS_STAGES[currentStage].id]: e.target.value } }))}
                                                autoFocus
                                            />

                                            {/* AI & Navigation Bar */}
                                            <div className="mt-6 flex items-center justify-between">
                                                <button
                                                    onClick={handleAICoach}
                                                    disabled={isAnalyzing}
                                                    className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full transition-colors"
                                                >
                                                    <Sparkles size={16} className={isAnalyzing ? "animate-spin" : ""} /> {isAnalyzing ? "Thinking..." : "AI Insight"}
                                                </button>

                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => setCurrentStage(p => Math.max(0, p - 1))} disabled={currentStage === 0}
                                                        className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                                                    >
                                                        <ChevronLeft size={24} />
                                                    </button>
                                                    {currentStage < GIBBS_STAGES.length - 1 ? (
                                                        <button
                                                            onClick={() => setCurrentStage(p => Math.min(GIBBS_STAGES.length - 1, p + 1))}
                                                            className="h-12 px-6 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-700 flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                                                        >
                                                            Next <ChevronRight size={20} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={handleSubmit} disabled={submitting}
                                                            className="h-12 px-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                                                        >
                                                            {submitting ? 'Saving...' : <><Save size={20} /> Complete Journal</>}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>

                                    {/* AI Toast */}
                                    <AnimatePresence>
                                        {aiFeedback && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-24 left-1/2 -translate-x-1/2 w-3/4 bg-white/90 backdrop-blur-md shadow-2xl rounded-xl p-4 border border-indigo-100 text-center">
                                                <p className="text-indigo-900 font-medium text-sm">{aiFeedback}</p>
                                                <button onClick={() => setAiFeedback(null)} className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
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
