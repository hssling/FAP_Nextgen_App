import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Sparkles, BookOpen, Stethoscope, Users, Loader, Mic, MicOff, Trash2, Settings, Zap, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { get, set } from 'idb-keyval';

// Available FREE AI Providers
const AI_PROVIDERS = {
    openrouter: {
        name: 'OpenRouter',
        description: 'Multiple free models (Recommended)',
        apiKeyEnv: 'VITE_OPENROUTER_API_KEY',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        models: [
            { id: 'google/gemma-2-9b-it:free', name: 'Google Gemma 2 9B', speed: 'Fast' },
            { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Meta LLaMA 3.2 3B', speed: 'Very Fast' },
            { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', speed: 'Fast' },
            { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B', speed: 'Fast' },
            { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B', speed: 'Medium' }
        ],
        signupUrl: 'https://openrouter.ai/keys',
        instructions: 'Sign up free with Google, no credit card needed'
    },
    xai: {
        name: 'xAI (Grok)',
        description: 'Advanced AI models by xAI',
        apiKeyEnv: 'VITE_xAI_API_KEY',
        endpoint: 'https://api.x.ai/v1/chat/completions',
        models: [
            { id: 'grok-beta', name: 'Grok Beta', speed: 'Fast' },
            { id: 'grok-2', name: 'Grok 2', speed: 'Fast' },
            { id: 'grok-vision-beta', name: 'Grok Vision', speed: 'Medium' }
        ],
        signupUrl: 'https://console.x.ai/',
        instructions: 'Sign up at xAI Console to get your API key'
    },
    google: {
        name: 'Google AI Studio',
        description: 'Gemini models (Free)',
        apiKeyEnv: 'VITE_GOOGLE_AI_KEY',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        models: [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', speed: 'Very Fast' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', speed: 'Fast' }
        ],
        signupUrl: 'https://aistudio.google.com/app/apikey',
        instructions: 'Free with Google account, no credit card'
    },
    mistral: {
        name: 'Mistral AI',
        description: 'Native Mistral models',
        apiKeyEnv: 'VITE_MISTRAL_API_KEY',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        models: [
            { id: 'mistral-small-latest', name: 'Mistral Small', speed: 'Fast' },
            { id: 'mistral-medium-latest', name: 'Mistral Medium', speed: 'Fast' },
            { id: 'mistral-large-latest', name: 'Mistral Large', speed: 'Fast' }
        ],
        signupUrl: 'https://console.mistral.ai/',
        instructions: 'Free tier available on Mistral La Plateforme'
    },
    cerebras: {
        name: 'Cerebras',
        description: 'Extreme speed inference',
        apiKeyEnv: 'VITE_CEREBRAS_API_KEY',
        endpoint: 'https://api.cerebras.ai/v1/chat/completions',
        models: [
            { id: 'llama3.1-8b', name: 'Llama 3.1 8B', speed: 'Instant' },
            { id: 'llama3.1-70b', name: 'Llama 3.1 70B', speed: 'Very Fast' }
        ],
        signupUrl: 'https://cloud.cerebras.ai/',
        instructions: 'Sign up for Cerebras Cloud API'
    },
    huggingface: {
        name: 'Hugging Face',
        description: 'Open source models',
        apiKeyEnv: 'VITE_HUGGINGFACE_API_KEY',
        endpoint: 'https://api-inference.huggingface.co/v1/chat/completions',
        models: [
            { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', speed: 'Medium' },
            { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B v0.3', speed: 'Medium' }
        ],
        signupUrl: 'https://huggingface.co/settings/tokens',
        instructions: 'Create a Read token on Hugging Face'
    }
};

const AICoach = () => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState('openrouter');
    const [selectedModel, setSelectedModel] = useState(0);
    const [providerStatus, setProviderStatus] = useState({});

    // Initialize default greeting if no history
    const defaultGreeting = {
        role: 'assistant',
        content: `Hello ${profile?.full_name || 'Student'}! 👋 I'm your AI Medical Coach. I specialize in Family Adoption Programme (FAP) and Community Medicine. I can help you with:

• Understanding NMC competencies and learning objectives
• Clinical case discussions and differential diagnosis
• Community health program guidance
• Reflection writing and documentation tips
• Exam preparation and concept clarification

What would you like to learn about today?`,
        timestamp: new Date()
    };

    const quickPrompts = [
        { icon: BookOpen, text: "Explain social determinants of health", category: "Concept" },
        { icon: Stethoscope, text: "Help me analyze a hypertension case", category: "Clinical" },
        { icon: Users, text: "How to conduct family health assessment?", category: "Practical" },
        { icon: MessageCircle, text: "Write a reflection on my village visit", category: "Documentation" },
        { icon: Brain, text: "Explain epidemiological triad", category: "Theory" },
        { icon: Zap, text: "Quick DDx for fever with rash", category: "Clinical" }
    ];

    // Load Chat History and Settings
    useEffect(() => {
        const loadHistory = async () => {
            const cachedMessages = await get('fap_ai_chat_history');
            if (cachedMessages && cachedMessages.length > 0) {
                const parsed = cachedMessages.map(m => ({
                    ...m,
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
            if (savedProvider) setSelectedProvider(savedProvider);
            
            const savedModel = await get('fap_ai_model');
            if (savedModel !== undefined) setSelectedModel(savedModel);
        };
        loadHistory();
        checkProviderStatus();
    }, []);

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

    const checkProviderStatus = () => {
        const status = {};
        Object.keys(AI_PROVIDERS).forEach(key => {
            const envKey = AI_PROVIDERS[key].apiKeyEnv;
            const apiKey = import.meta.env[envKey];
            status[key] = apiKey && apiKey.length > 10;
        });
        setProviderStatus(status);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const getSystemPrompt = () => {
        return `You are an expert medical educator specializing in Community Medicine and Family Medicine for Indian medical students following the NMC-CBME curriculum. 

Context: The student is in the Family Adoption Programme (FAP) where they adopt a family for 3 years and learn community medicine competencies.

Student Profile: ${profile?.full_name || 'Medical Student'}, Year ${profile?.year || 'N/A'}

Guidelines:
- Provide helpful, accurate, and educational responses
- Use simple language with practical examples from Indian healthcare
- Relate to FAP activities when relevant
- Keep responses concise (2-3 paragraphs max)
- Include clinical pearls and practical tips
- Reference NMC competencies when applicable`;
    };

    const callOpenRouter = async (conversationMessages, controller) => {
        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('API_KEY_REQUIRED');

        const provider = AI_PROVIDERS.openrouter;
        const models = provider.models;
        
        for (let i = 0; i < models.length; i++) {
            try {
                const response = await fetch(provider.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'FAP Medical Coach'
                    },
                    body: JSON.stringify({
                        model: models[i].id,
                        messages: conversationMessages,
                        temperature: 0.7,
                        max_tokens: 1000
                    }),
                    signal: controller.signal
                });

                if (response.status === 429) {
                    console.log(`Rate limited on ${models[i].name}, trying next...`);
                    continue;
                }

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error?.message || `API Error: ${response.status}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;
            } catch (err) {
                if (err.name === 'AbortError') throw err;
                if (i === models.length - 1) throw err;
                console.log(`Error with ${models[i].name}, trying next...`);
            }
        }
    };

    const callXAI = async (conversationMessages, controller) => {
        const apiKey = import.meta.env.VITE_xAI_API_KEY;
        if (!apiKey) throw new Error('API_KEY_REQUIRED');

        const provider = AI_PROVIDERS.xai;
        const model = provider.models[selectedModel] || provider.models[0];

        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model.id,
                messages: conversationMessages,
                temperature: 0.7,
                max_tokens: 1000
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `xAI Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    };

    const callGoogleAI = async (conversationMessages, controller) => {
        const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
        if (!apiKey) throw new Error('API_KEY_REQUIRED');

        // Convert to Google's format
        const contents = conversationMessages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const systemInstruction = conversationMessages.find(m => m.role === 'system')?.content || '';

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Google AI Error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    };

    const callMistral = async (conversationMessages, controller) => {
        const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
        if (!apiKey) throw new Error('API_KEY_REQUIRED');

        const provider = AI_PROVIDERS.mistral;
        const model = provider.models[selectedModel] || provider.models[0];

        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model.id,
                messages: conversationMessages,
                temperature: 0.7,
                max_tokens: 1000
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Mistral Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    };

    const callCerebras = async (conversationMessages, controller) => {
        const apiKey = import.meta.env.VITE_CEREBRAS_API_KEY;
        if (!apiKey) throw new Error('API_KEY_REQUIRED');

        const provider = AI_PROVIDERS.cerebras;
        const model = provider.models[selectedModel] || provider.models[0];

        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model.id,
                messages: conversationMessages,
                temperature: 0.7,
                max_tokens: 1000
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Cerebras Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    };

    const callHuggingFace = async (conversationMessages, controller) => {
        const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
        if (!apiKey) throw new Error('API_KEY_REQUIRED');

        const provider = AI_PROVIDERS.huggingface;
        const model = provider.models[selectedModel] || provider.models[0];

        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model.id,
                messages: conversationMessages,
                temperature: 0.7,
                max_tokens: 1000
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Hugging Face Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "No content returned from Hugging Face.";
    };

    const sendMessage = async (overrideMessage = null) => {
        const messageText = overrideMessage || input.trim();
        if (!messageText || isLoading) return;

        setShowQuickPrompts(false);
        const userMessage = { role: 'user', content: messageText, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

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

            try {
                if (!isLocalhost && import.meta.env.PROD) {
                    // Production: Use secure Edge Function
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
                    // Development: Use selected provider
                    clearTimeout(timeoutId);

                    switch (selectedProvider) {
                        case 'xai':
                            responseText = await callXAI(conversationMessages, controller);
                            break;
                        case 'google':
                            responseText = await callGoogleAI(conversationMessages, controller);
                            break;
                        case 'mistral':
                            responseText = await callMistral(conversationMessages, controller);
                            break;
                        case 'cerebras':
                            responseText = await callCerebras(conversationMessages, controller);
                            break;
                        case 'huggingface':
                            responseText = await callHuggingFace(conversationMessages, controller);
                            break;
                        case 'openrouter':
                        default:
                            responseText = await callOpenRouter(conversationMessages, controller);
                            break;
                    }
                }

                const assistantMessage = {
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
3. Add to your \`.env\` file: 
   \`${provider.apiKeyEnv}=your_key_here\`
4. Restart the dev server

💡 **Tip:** Click the ⚙️ Settings button to see all available providers!`;
            } else if (error.message === 'TIMEOUT' || error.name === 'AbortError') {
                errorMsg = `⏱️ **Request Timed Out**

The AI model took too long to respond. Try:
• Clicking "Try again" - it usually works on retry
• Switching to a faster model in ⚙️ Settings`;
            } else if (error.message.includes('429')) {
                errorMsg = '⚠️ Rate limit reached. Please wait a moment and try again.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                errorMsg = '⚠️ Network error. Please check your internet connection.';
            } else {
                errorMsg = `⚠️ Error: ${error.message}. Please try again.`;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const currentProvider = AI_PROVIDERS[selectedProvider];

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
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
                            {quickPrompts.map((prompt, idx) => (
                                <button
                                    key={idx}
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
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
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
                                : 'white',
                            color: msg.role === 'user' ? 'white' : '#374151',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {msg.content}
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
