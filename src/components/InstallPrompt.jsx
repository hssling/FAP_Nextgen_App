import React, { useEffect, useState } from 'react';
import { Download, X, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowPrompt(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleShare = async () => {
        const shareData = {
            title: 'FAP NextGen',
            text: 'Check out the Family Adoption Programme App! Install it here:',
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback to WhatsApp
            const text = encodeURIComponent(`${shareData.text} ${shareData.url}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    style={{
                        position: 'fixed',
                        bottom: '1rem',
                        left: '1rem',
                        right: '1rem',
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        border: '1px solid var(--color-border)',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        maxWidth: '400px',
                        margin: '0 auto'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#F0FDFA',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0F766E'
                        }}>
                            <Download size={20} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: '600' }}>Install App</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Get faster access & offline mode</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={handleShare}
                            title="Share App"
                            style={{
                                background: '#E0F2FE',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.5rem',
                                color: '#0284C7',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Share2 size={18} />
                        </button>
                        <button
                            onClick={handleInstallClick}
                            style={{
                                backgroundColor: '#0F766E',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Install
                        </button>
                        <button
                            onClick={() => setShowPrompt(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                padding: '0.25rem'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InstallPrompt;
