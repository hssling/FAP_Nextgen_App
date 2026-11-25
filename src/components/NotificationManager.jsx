import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { subscribeDevice } from '../services/pushSubscription';

const NotificationManager = () => {
    const { profile } = useAuth();
    const [working, setWorking] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    const [publicKey, setPublicKey] = useState('');
    useEffect(() => {
        if (profile?.role !== 'teacher' || !supabase) return undefined;
        let active = true;
        supabase.functions.invoke('mentor-push', { method: 'GET' })
            .then(({ data, error }) => {
                if (error) throw error;
                if (active && data?.publicKey) setPublicKey(data.publicKey);
            })
            .catch(() => { if (active) console.warn('Push configuration unavailable.'); });
        return () => { active = false; };
    }, [profile?.role]);
    const supported = typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && permission !== 'unsupported';

    const enable = async () => {
        if (permission === 'unsupported') return;
        if (profile?.role === 'teacher' && (!supported || !publicKey || !supabase || !profile?.id)) return;
        setWorking(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result !== 'granted') throw new Error('Notification permission was not granted.');
            if (profile?.role === 'teacher') {
                const registration = await navigator.serviceWorker.ready;
                await subscribeDevice({ registration, client: supabase, userId: profile.id, publicKey });
                setEnabled(true);
                toast.success('Device notifications enabled.');
            } else toast.success('Browser notification permission granted.');
        } catch (error) {
            console.error('Could not enable device notifications:', error);
            toast.error(error.message || 'Could not enable notifications on this device.');
        } finally { setWorking(false); }
    };

    const testNotification = async () => {
        try {
            if (permission !== 'granted') throw new Error('Allow browser notifications first.');
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('FAP NextGen', { body: 'This is a local test notification.', icon: '/pwa-192x192.png' });
        } catch (error) { toast.error(error.message || 'Unable to show the test notification.'); }
    };

    return (
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Bell size={24} color="#0F766E" />
            <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0 }}>Device notifications</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {profile?.role !== 'teacher' ? 'Message alerts appear while you use the app.' :
                        !supported ? 'On iPhone or iPad, add the app to your Home Screen and open it there to enable notifications.' :
                        !publicKey ? 'Device notifications are not configured yet.' :
                        permission === 'denied' ? 'Allow notifications for FAP NextGen in your device settings.' :
                        enabled ? 'This device is registered for mentor alerts.' : 'Enable alerts for new messages and reflections on this device.'}
                </p>
            </div>
            {permission === 'granted' && 'serviceWorker' in navigator && (
                <button type="button" onClick={testNotification} className="btn btn-outline">Test</button>
            )}
            {((profile?.role === 'teacher' && supported && publicKey) || (profile?.role !== 'teacher' && permission === 'default')) && permission !== 'denied' && (
                <button type="button" onClick={enable} disabled={working} className="btn btn-primary">
                    {working ? 'Enabling…' : enabled ? 'Enable again' : 'Enable'}
                </button>
            )}
        </div>
    );
};

export default NotificationManager;
