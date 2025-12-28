import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Sparkles, BookOpen, Stethoscope, Users, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

const AICoach = () => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hello ${profile?.full_name || 'Student'}! 👋 I'm your AI Medical Coach. I specialize in Family Adoption Programme (FAP) and Community Medicine. I can help you with:

• Understanding NMC competencies and learning objectives
• Clinical case discussions and differential diagnosis
• Community health program guidance
• Reflection writing and documentation tips
• Exam preparation and concept clarification

What would you like to learn about today?`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);

    const quickPrompts = [
        { icon: BookOpen, text: "Explain social determinants of health", category: "Concept" },
        { icon: Stethoscope, text: "Help me analyze a hypertension case", category: "Clinical" },
        { icon: Users, text: "How to conduct family health assessment?", category: "Practical" },
        { icon: MessageCircle, text: "Write a reflection on my village visit", category: "Documentation" }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (messageText = input) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage = {
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setShowQuickPrompts(false);

        try {
            const conversationMessages = [
                {
                    role: "system",
                    content: `You are an expert medical educator specializing in Community Medicine and Family Medicine for Indian medical students following the NMC-CBME curriculum. 

Context: The student is in the Family Adoption Programme (FAP) where they adopt a family for 3 years and learn community medicine competencies.

Student Profile: ${profile?.full_name}, Year ${profile?.year || 'N/A'}

Provide helpful, accurate, and educational responses. Use simple language, include practical examples from Indian healthcare context, and relate to FAP activities when relevant. Keep responses concise (2-3 paragraphs max).`
                },
                ...messages.slice(-4).map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                {
                    role: "user",
                    content: messageText
                }
            ];

            let data;

            // Use Edge Function in production, direct API in development
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (!isLocalhost && import.meta.env.PROD) {
                // Production: Use secure Edge Function
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    throw new Error('Please log in to use AI Coach');
                }

                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ messages: conversationMessages })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                data = await response.json();
            } else {
                // Development: Direct API call
                const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

                if (!apiKey || apiKey === 'YOUR_OPENROUTER_API_KEY_HERE') {
                    throw new Error('API_KEY_REQUIRED');
                }

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'FAP Medical Coach'
                    },
                    body: JSON.stringify({
                        model: "meta-llama/llama-3.1-8b-instruct:free",
                        messages: conversationMessages,
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('API_KEY_INVALID');
                    }
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
                }

                data = await response.json();
            }

            if (data.choices && data.choices[0]?.message?.content) {
                const aiMessage = {
                    role: 'assistant',
                    content: data.choices[0].message.content,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                throw new Error('No response generated');
            }
        } catch (error) {
            console.error('AI Coach Error:', error);
            let errorMsg = '';

            if (error.message === 'API_KEY_REQUIRED' || error.message === 'API_KEY_INVALID') {
                errorMsg = `🔑 **AI Coach Setup Required**

To enable the AI Medical Coach in development:

1. Get a FREE API key from: **https://openrouter.ai/keys**
2. Sign up with Google (no credit card needed)
3. Add to your \`.env\` file: 
   \`VITE_OPENROUTER_API_KEY=sk-or-v1-your_key_here\`
4. Restart the dev server

✨ OpenRouter is free for students!
⚡ In production, this uses a secure server-side API.`;
            } else if (error.message.includes('RATE_LIMIT') || error.message.includes('429')) {
                errorMsg = '⚠️ Too many requests. Please wait a moment and try again.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                errorMsg = '⚠️ Network error. Please check your internet connection.';
            } else {
                errorMsg = `⚠️ Sorry, I encountered an error. ${error.message}. Please try again.`;
            }

            const errorMessage = {
                role: 'assistant',
                content: errorMsg,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
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

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '2rem',
                    color: 'white',
                    borderRadius: '12px',
                    marginBottom: '1.5rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <Sparkles size={32} />
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>AI Medical Coach</h1>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>
                            Powered by OpenRouter • Free for Students
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Messages Container */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                background: 'var(--color-bg-secondary)',
                borderRadius: '12px',
                marginBottom: '1rem'
            }}>
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{
                                display: 'flex',
                                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: '1rem'
                            }}
                        >
                            <div style={{
                                maxWidth: '75%',
                                padding: '1rem 1.25rem',
                                borderRadius: '16px',
                                background: message.role === 'user'
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : 'var(--color-bg)',
                                color: message.role === 'user' ? 'white' : 'var(--color-text)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6'
                            }}>
                                {message.content}
                                <div style={{
                                    fontSize: '0.75rem',
                                    opacity: 0.7,
                                    marginTop: '0.5rem'
                                }}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)' }}
                    >
                        <Loader size={16} className="spin" />
                        <span>AI Coach is thinking...</span>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {showQuickPrompts && messages.length === 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                    }}
                >
                    {quickPrompts.map((prompt, idx) => (
                        <motion.button
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => sendMessage(prompt.text)}
                            className="card"
                            style={{
                                padding: '1rem',
                                textAlign: 'left',
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                                background: 'var(--color-bg)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <prompt.icon size={20} style={{ color: 'var(--color-primary)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                                    {prompt.category}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{prompt.text}</p>
                        </motion.button>
                    ))}
                </motion.div>
            )}

            {/* Input Area */}
            <div style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '1rem',
                background: 'var(--color-bg)',
                borderRadius: '12px',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
            }}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about Community Medicine, FAP, or medical concepts..."
                    style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        resize: 'none',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        minHeight: '60px',
                        maxHeight: '120px'
                    }}
                    disabled={isLoading}
                />
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="btn btn-primary"
                    style={{
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: (!input.trim() || isLoading) ? 0.5 : 1
                    }}
                >
                    <Send size={20} />
                    Send
                </motion.button>
            </div>
        </div>
    );
};

export default AICoach;
