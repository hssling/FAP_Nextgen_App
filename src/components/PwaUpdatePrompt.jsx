import React, { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

const bannerStyle = {
    position: 'fixed',
    left: '50%',
    bottom: '1rem',
    transform: 'translateX(-50%)',
    background: '#0F172A',
    color: 'white',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    zIndex: 9999
};

const buttonStyle = {
    background: '#14B8A6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.4rem 0.75rem',
    cursor: 'pointer',
    fontWeight: 600
};

const subtleButtonStyle = {
    ...buttonStyle,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)'
};

const PwaUpdatePrompt = () => {
    const updateSWRef = useRef(null);
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showOnline, setShowOnline] = useState(false);

    useEffect(() => {
        updateSWRef.current = registerSW({
            onNeedRefresh() {
                setNeedRefresh(true);
            },
            onOfflineReady() {
                setOfflineReady(true);
                setTimeout(() => setOfflineReady(false), 4000);
            }
        });
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setShowOnline(true);
            setTimeout(() => setShowOnline(false), 3000);
        };
        const handleOffline = () => {
            setIsOffline(true);
            setShowOnline(false);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleReload = () => {
        if (updateSWRef.current) {
            updateSWRef.current(true);
        } else {
            window.location.reload();
        }
    };

    if (needRefresh) {
        return (
            <div style={bannerStyle} role="status" aria-live="polite">
                <span>New version available.</span>
                <button style={buttonStyle} onClick={handleReload}>Reload</button>
                <button style={subtleButtonStyle} onClick={() => setNeedRefresh(false)}>Later</button>
            </div>
        );
    }

    if (isOffline) {
        return (
            <div style={{ ...bannerStyle, background: '#7C2D12' }} role="status" aria-live="polite">
                <span>You are offline. Changes will sync when back online.</span>
            </div>
        );
    }

    if (showOnline) {
        return (
            <div style={{ ...bannerStyle, background: '#065F46' }} role="status" aria-live="polite">
                <span>Back online. Syncing will resume.</span>
            </div>
        );
    }

    if (offlineReady) {
        return (
            <div style={{ ...bannerStyle, background: '#0F766E' }} role="status" aria-live="polite">
                <span>App ready for offline use.</span>
            </div>
        );
    }

    return null;
};

export default PwaUpdatePrompt;
