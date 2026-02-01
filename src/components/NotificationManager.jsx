import React, { useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationManager = () => {
    const [permission, setPermission] = useState(Notification.permission);

    const requestPermission = async () => {
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                toast.success('Notifications enabled!');
                // Here we would normally subscribe to PushManager
            } else {
                toast.error('Notifications blocked.');
            }
        } catch (error) {
            console.error('Error requesting permission', error);
        }
    };

    const sendTestNotification = () => {
        if (permission === 'granted') {
            // Check if SW is ready to show specific service worker notification (for mobile mostly)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification('FAP NextGen', {
                        body: 'This is a test notification from the FAP App! 🔔',
                        icon: '/pwa-192x192.png',
                        vibrate: [200, 100, 200],
                        actions: [
                            { action: 'open', title: 'Open App' }
                        ]
                    });
                });
            } else {
                // Fallback for desktop testing without SW sometimes
                new Notification('FAP NextGen', {
                    body: 'This is a test notification! 🔔',
                    icon: '/pwa-192x192.png'
                });
            }
        } else {
            toast.error('Please enable notifications first.');
        }
    };

    if (permission === 'denied') {
        return (
            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <BellOff size={24} color="#EF4444" />
                <div>
                    <h4 style={{ margin: 0, color: '#991B1B' }}>Notifications Blocked</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#B91C1C' }}>Enable in browser settings to receive reminders.</p>
                </div>
            </div>
        );
    }

    if (permission === 'default') {
        return (
            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Bell size={24} color="#0284C7" />
                    <div>
                        <h4 style={{ margin: 0, color: '#075985' }}>Enable Reminders</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#0369A1' }}>Get notified about upcoming visits.</p>
                    </div>
                </div>
                <button
                    onClick={requestPermission}
                    className="btn btn-primary"
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                >
                    Enable
                </button>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Bell size={24} color="#059669" />
                <div>
                    <h4 style={{ margin: 0 }}>Notifications Active</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>You will receive alerts for visits.</p>
                </div>
            </div>
            <button
                onClick={sendTestNotification}
                className="btn btn-outline"
                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem' }}
            >
                <Send size={16} /> Test
            </button>
        </div>
    );
};

export default NotificationManager;
