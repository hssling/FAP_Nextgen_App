import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
    MessageCircle, Send, Sparkles, BookOpen, Stethoscope, Users, 
    Loader, Mic, MicOff, Trash2, Settings, Zap, Brain, 
    CheckCircle, AlertCircle, CloudOff 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { supabase } from '../services/supabaseClient';
import { get, set } from 'idb-keyval';
import { AI_PROVIDERS, DEFAULT_AI_PROVIDER } from '../services/aiProviders';
import { callProviderChat, hasProviderKey } from '../services/aiClient';
import { getCurrentStudyYear, getYearOfJoining } from '../utils/studentIdentity';


const AICoach = () => {
    const { profile, loading } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(DEFAULT_AI_PROVIDER);
    const [selectedModel, setSelectedModel] = useState(0);
    const [providerStatus, setProviderStatus] = useState({});
    const [visibleCount, setVisibleCount] = useState(50);
    const createMessageId = () => (
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    // Cache bust: 2024-12-27-03:41
    const defaultGreeting = useMemo(() => ({
        id: createMessageId(),
        role: 'assistant',
        content: `Hello ${profile?.full_name || 'Student'}! 👋 I'm your AI Medical Coach. I specialize in Family Adoption Programme (FAP) and Community Medicine. I can help you with:

• Understanding NMC competencies and learning objectives
• Clinical case discussions and differential diagnosis
• Community health program guidance
• Reflection writing and documentation tips
• Exam preparation and concept clarification

What would you like to learn about today?`,
        timestamp: new Date()
    }), [profile]);

    const quickPrompts = [
        { icon: BookOpen, text: "Explain social determinants of health", category: "Concept" },
        { icon: Stethoscope, text: "Help me analyze a hypertension case", category: "Clinical" },
        { icon: Users, text: "How to conduct family health assessment?", category: "Practical" },
        { icon: MessageCircle, text: "Write a reflection on my village visit", category: "Documentation" },
        { icon: Brain, text: "Explain epidemiological triad", category: "Theory" },
        { icon: Zap, text: "Quick DDx for fever with rash", category: "Clinical" }
    ];

    const checkProviderStatus = useCallback(async () => {
        const entries = await Promise.all(
            Object.keys(AI_PROVIDERS).map(async (key) => [key, await hasProviderKey(key)])
        );
        setProviderStatus(Object.fromEntries(entries));
    }, []);

    // Load Chat History and Settings
    useEffect(() => {
        const loadHistory = async () => {
            const cachedMessages = await get('fap_ai_chat_history');
            if (cachedMessages && cachedMessages.length > 0) {
                const parsed = cachedMessages.map(m => ({
                    ...m,
                    id: m.id || createMessageId(),
                    timestamp: new Date(m.timestamp)
                }));
                setMessages(parsed);
                setShowQuickPrompts(false);
            } else {
                setMessages([defaultGreeting]);
                setShowQuickPrompts(true);
            }

            // Load saved provider preference
            const savedProvider = await get('fap_ai_provider');
            if (savedProvider && AI_PROVIDERS[savedProvider]) setSelectedProvider(savedProvider);
            
            const savedModel = await get('fap_ai_model');
            if (savedModel !== undefined) setSelectedModel(savedModel);
        };
        loadHistory();
        checkProviderStatus();
    }, [defaultGreeting, checkProviderStatus]);

    useEffect(() => {
        if (showSettings) {
            checkProviderStatus();
        }
    }, [showSettings, checkProviderStatus]);

    // Save Chat History
    useEffect(() => {
        if (messages.length > 0) {
            set('fap_ai_chat_history', messages);
        }
    }, [messages]);

    // Save provider preference
    useEffect(() => {
        set('fap_ai_provider', selectedProvider);
        set('fap_ai_model', selectedModel);
    }, [selectedProvider, selectedModel]);
const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const visibleMessages = messages.slice(-visibleCount);

    // Speech Recognition
    const startListening = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event) => {
                setInput(event.results[0][0].transcript);
                setIsListening(false);
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);

            recognition.start();
        } else {
            alert('Speech recognition is not supported in your browser.');
        }
    };

    const clearHistory = async () => {
        if (confirm('Clear all chat history?')) {
            await set('fap_ai_chat_history', []);
            setMessages([defaultGreeting]);
            setShowQuickPrompts(true);
        }
    };

    const getSystemPrompt = useCallback(() => {
        const currentStudyYear = getCurrentStudyYear(profile);
        const joiningYear = getYearOfJoining(profile);
        return `You are an expert medical educator specializing in Community Medicine and Family Medicine for Indian medical students following the NMC-CBME curriculum. 

Context: The student is in the Family Adoption Programme (FAP) where they adopt a family for 3 years and learn community medicine competencies.

Student Profile: ${profile?.full_name || 'Medical Student'}, Batch ${joiningYear || 'N/A'}, Current MBBS Year ${currentStudyYear || profile?.year || 'N/A'}

Guidelines:
- Provide helpful, accurate, and educational responses
- Use simple language with practical examples from Indian healthcare
- Relate to FAP activities when relevant
- Keep responses concise (2-3 paragraphs max)
- Include clinical pearls and practical tips
- Reference NMC competencies when applicable`;
    }, [profile]);

    const callSelectedProvider = useCallback(async (conversationMessages, controller) => {
        return callProviderChat({
            providerKey: selectedProvider,
            messages: conversationMessages,
            controller,
            selectedModelIndex: selectedModel
        });
    }, [selectedProvider, selectedModel]);

    const sendMessage = useCallback(async (overrideMessage = null, isRetry = false) => {
        const messageText = overrideMessage || input.trim();
        if (!messageText || (isLoading && !isRetry)) return;

        const isOffline = !navigator.onLine;

        setShowQuickPrompts(false);
        
        if (!isRetry) {
            const userMessage = { 
                id: createMessageId(),
                role: 'user', 
                content: messageText, 
                timestamp: new Date(),
                status: isOffline ? 'pending' : 'sent'
            };
            setMessages(prev => [...prev, userMessage]);
            setInput('');
        } else {
            // Update status of existing message if retrying
            setMessages(prev => prev.map(m => 
                (m.content === messageText && m.role === 'user') ? { ...m, status: 'sent' } : m
            ));
        }

        if (isOffline) {
            const offlineNote = { 
                role: 'assistant', 
                content: "📱 **Offline Note**: Your question is queued. I'll provide an answer automatically as soon as your device reconnects.", 
                timestamp: new Date(),
                is_system: true
            };
            if (!isRetry) setMessages(prev => [...prev, offlineNote]);
            return;
        }

        setIsLoading(true);
        // Clear system notes when online
        setMessages(prev => prev.filter(m => !m.is_system));

        try {
            const conversationMessages = [
                { role: "system", content: getSystemPrompt() },
                ...messages.slice(-6).map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                { role: "user", content: messageText }
            ];

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            let responseText;
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const hasUserConfiguredKey = await hasProviderKey(selectedProvider);

            try {
                if (hasUserConfiguredKey) {
                    clearTimeout(timeoutId);
                    responseText = await callSelectedProvider(conversationMessages, controller);
                } else if (!isLocalhost && import.meta.env.PROD) {
                    // Production fallback for users without keys: use secure Edge Function
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error('Please log in to use AI Coach');

                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({ messages: conversationMessages }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`Server error: ${response.status}`);
                    
                    const data = await response.json();
                    responseText = data.choices?.[0]?.message?.content || data.response || 'No response received.';
                } else {
                    throw new Error('API_KEY_REQUIRED');
                }

                const assistantMessage = {
                    id: createMessageId(),
                    role: 'assistant',
                    content: responseText,
                    timestamp: new Date(),
                    provider: selectedProvider
                };
                setMessages(prev => [...prev, assistantMessage]);

            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        } catch (error) {
            console.error('AI Coach Error:', error);
            let errorMsg = '';

            if (error.message === 'API_KEY_REQUIRED' || error.message === 'API_KEY_INVALID') {
                const provider = AI_PROVIDERS[selectedProvider];
                errorMsg = `🔑 **${provider.name} API Key Required**

To enable the AI Medical Coach:

1. Get a FREE API key from: **${provider.signupUrl}**
2. ${provider.instructions}
3. Open Settings -> AI Integrations
4. Paste and save your key for ${provider.name}

💡 **Tip:** Click the ⚙️ Settings button to see all available providers!`;
            } else if (error.message === 'TIMEOUT' || error.name === 'AbortError') {
                errorMsg = `⏱️ **Request Timed Out**

The AI model took too long to respond. Try:
• Clicking "Try again" - it usually works on retry
• Switching to a faster model in ⚙️ Settings`;
            } else if (error.message.includes('429')) {
                errorMsg = '⚠️ Rate limit reached. Please wait a moment and try again.';
            } else if (error.message.toLowerCase().includes('provider returned error')) {
                errorMsg = '⚠️ Temporary provider issue. The app already tried fallback models. Please try again or switch provider in Settings.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                errorMsg = '⚠️ Network error. Please check your internet connection.';
            } else {
                errorMsg = `⚠️ Error: ${error.message}. Please try again.`;
            }

            setMessages(prev => [...prev, { id: createMessageId(), role: 'assistant', content: errorMsg, timestamp: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, selectedProvider, messages, callSelectedProvider, getSystemPrompt]);

    // Auto-retry pending messages when coming back online
    useEffect(() => {
        const handleOnline = () => {
            const hasPending = messages.some(m => m.status === 'pending');
            if (hasPending && !isLoading) {
                console.log("ðŸ“± [AI] Online! Retrying pending messages...");
                // Find first pending message
                const pending = messages.find(m => m.status === 'pending');
                if (pending) {
                    // We need to re-send this
                    sendMessage(pending.content, true);
                }
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [messages, isLoading, sendMessage]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const currentProvider = AI_PROVIDERS[selectedProvider];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <LoadingSpinner size={40} />
            </div>
        );
    }

    return (
        <div style={{ height: 'calc(100dvh - 80px)', minHeight: 'calc(100dvh - 80px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #E5E7EB',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>AI Medical Coach</h1>
                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>
                                {currentProvider.name} • {messages.length} messages
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            style={{
                                padding: '0.5rem',
                                background: showSettings ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: 'white'
                            }}
                            title="Settings"
                        >
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={clearHistory}
                            style={{
                                padding: '0.5rem',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: 'white'
                            }}
                            title="Clear History"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', marginTop: '1rem' }}
                        >
                            <div style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '1rem'
                            }}>
                                <p style={{ fontSize: '0.75rem', marginBottom: '0.75rem', opacity: 0.9 }}>
                                    Select AI Provider (Free options):
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setSelectedProvider(key);
                                                setSelectedModel(0);
                                            }}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: selectedProvider === key ? 'white' : 'rgba(255,255,255,0.2)',
                                                color: selectedProvider === key ? '#667eea' : 'white',
                                                border: 'none',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            {providerStatus[key] ? (
                                                <CheckCircle size={14} style={{ color: selectedProvider === key ? '#10B981' : '#10B981' }} />
                                            ) : (
                                                <AlertCircle size={14} style={{ color: selectedProvider === key ? '#F59E0B' : 'rgba(255,255,255,0.7)' }} />
                                            )}
                                            {provider.name}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ marginTop: '0.75rem' }}>
                                    <label style={{ fontSize: '0.72rem', opacity: 0.9, display: 'block', marginBottom: '0.35rem' }}>
                                        Model
                                    </label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            maxWidth: '420px',
                                            padding: '0.45rem 0.6rem',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.35)',
                                            background: 'rgba(255,255,255,0.18)',
                                            color: 'white'
                                        }}
                                    >
                                        {currentProvider.models.map((model, idx) => (
                                            <option key={model.id} value={idx} style={{ color: '#111827' }}>
                                                {model.name} ({model.speed})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <p style={{ fontSize: '0.7rem', marginTop: '0.75rem', opacity: 0.8 }}>
                                    {currentProvider.description} • 
                                    <a href={currentProvider.signupUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'white', marginLeft: '4px' }}>
                                        Get free API key →
                                    </a>
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '1rem',
                background: '#F8FAFC'
            }}>
                {messages.length > visibleCount && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setVisibleCount(prev => Math.min(messages.length, prev + 50))}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '999px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: '#4B5563'
                            }}
                        >
                            Load older messages ({messages.length - visibleCount})
                        </button>
                    </div>
                )}
                {/* Quick Prompts */}
                <AnimatePresence>
                    {showQuickPrompts && messages.length <= 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '0.75rem',
                                marginBottom: '1.5rem'
                            }}
                        >
                            {quickPrompts.map((prompt) => (
                                <button
                                    key={prompt.text}
                                    onClick={() => sendMessage(prompt.text)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '1rem',
                                        background: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = '#667eea';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = '#E5E7EB';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        <prompt.icon size={18} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: '#667eea', fontWeight: '600' }}>{prompt.category}</span>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{prompt.text}</p>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Message List */}
                {visibleMessages.map((msg) => (
                    <motion.div
                        key={msg.id || `${msg.role}-${msg.timestamp}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: '1rem'
                        }}
                    >
                        <div style={{
                            maxWidth: '80%',
                            padding: '1rem',
                            borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: msg.role === 'user' 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                : msg.is_system ? '#F1F5F9' : 'white',
                            color: msg.role === 'user' ? 'white' : '#374151',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            whiteSpace: 'pre-wrap',
                            border: msg.status === 'pending' ? '1px dashed rgba(255,255,255,0.5)' : 'none',
                            position: 'relative'
                        }}>
                            {msg.content}
                            {msg.status === 'pending' && (
                                <div style={{ fontSize: '0.6rem', opacity: 0.8, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CloudOff size={10} /> Queued (Offline)
                                </div>
                            )}
                            {msg.provider && msg.role === 'assistant' && (
                                <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                                    via {AI_PROVIDERS[msg.provider]?.name || msg.provider}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}
                    >
                        <div style={{
                            padding: '1rem',
                            borderRadius: '18px 18px 18px 4px',
                            background: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Loader size={18} className="animate-spin" style={{ color: '#667eea' }} />
                            <span style={{ color: '#6B7280' }}>Thinking...</span>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '1rem',
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
                borderTop: '1px solid #E5E7EB',
                background: 'white'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-end'
                }}>
                    <button
                        onClick={startListening}
                        disabled={isListening}
                        style={{
                            padding: '0.75rem',
                            background: isListening ? '#EF4444' : '#F3F4F6',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: isListening ? 'white' : '#6B7280'
                        }}
                        title="Voice Input"
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about FAP, Community Medicine, or clinical cases..."
                        rows={1}
                        style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            border: '1px solid #E5E7EB',
                            borderRadius: '12px',
                            resize: 'none',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            minHeight: '48px',
                            maxHeight: '120px'
                        }}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isLoading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: input.trim() && !isLoading
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : '#E5E7EB',
                            color: input.trim() && !isLoading ? 'white' : '#9CA3AF',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '600'
                        }}
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.5rem', textAlign: 'center' }}>
                    AI responses are for educational purposes only. Always verify clinical information.
                </p>
            </div>
        </div>
    );
};

export default AICoach;



