import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Sparkles, BookOpen, Stethoscope, Users, X, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AICoach = () => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hello ${profile?.full_name || 'Student'}! 👋 I'm your AI Medical Coach, specialized in Family Adoption Programme (FAP) and Community Medicine. I can help you with:

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

        // Check if API key is configured
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            const errorMessage = {
                role: 'assistant',
                content: `⚠️ **AI Coach Not Configured**

The Gemini API key is missing. To enable the AI Medical Coach:

1. Get a free API key from: https://makersuite.google.com/app/apikey
2. Create a \`.env\` file in the project root (copy from \`.env.example\`)
3. Add your key: \`VITE_GEMINI_API_KEY=your_actual_key_here\`
4. Restart the development server

Once configured, I'll be ready to help with your medical studies! 🎓`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

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
            // Using gemini-1.5-flash (faster and more reliable than gemini-pro)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are an expert medical educator specializing in Community Medicine and Family Medicine for Indian medical students following the NMC-CBME curriculum. 

Context: The student is in the Family Adoption Programme (FAP) where they adopt a family for 3 years and learn community medicine competencies.

Student Profile: ${profile?.full_name}, Year ${profile?.year || 'N/A'}

Previous conversation:
${messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

Current question: ${messageText}

Provide a helpful, accurate, and educational response. Use simple language, include practical examples from Indian healthcare context, and relate to FAP activities when relevant. Keep responses concise (2-3 paragraphs max).`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                const aiMessage = {
                    role: 'assistant',
                    content: data.candidates[0].content.parts[0].text,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
            } else if (data.error) {
                throw new Error(data.error.message || 'Invalid API response');
            } else {
                throw new Error('No response generated');
            }
        } catch (error) {
            console.error('AI Coach Error:', error);
            let errorMsg = '⚠️ Sorry, I encountered an error. ';

            if (error.message.includes('API_KEY_INVALID')) {
                errorMsg += 'Your API key appears to be invalid. Please check your .env file.';
            } else if (error.message.includes('RATE_LIMIT')) {
                errorMsg += 'Rate limit exceeded. Please wait a moment and try again.';
            } else if (error.message.includes('SAFETY')) {
                errorMsg += 'The response was blocked due to safety filters. Please rephrase your question.';
            } else {
                errorMsg += `${error.message}. Please try again.`;
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
                            Your 24/7 learning companion for Community Medicine & FAP
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
