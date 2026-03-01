import React, { useEffect } from 'react';
import { processQueue } from '../services/offlineQueue';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

const OfflineSyncManager = () => {
    const queryClient = useQueryClient();
    const { user, loading } = useAuth();
    const userId = user?.id || null;

    useEffect(() => {
        // Handler for sync completion to invalidate queries
        const handleSyncComplete = () => {
            console.log('[OfflineSyncManager] Sync complete, invalidating queries...');
            queryClient.invalidateQueries();
            // Specifically invalidate families and dashboard
            queryClient.invalidateQueries({ queryKey: ['families'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        };

        // Listen for custom sync event
        window.addEventListener('fap-sync-complete', handleSyncComplete);

        // Network status listeners
        const handleOnline = () => {
            if (!userId) return;
            console.log('[OfflineSyncManager] Online detected with authenticated user, processing queue...');
            processQueue().catch((err) => console.warn('[OfflineSyncManager] Queue processing failed:', err));
        };

        window.addEventListener('online', handleOnline);

        // Attempt to process on mount only when authenticated
        if (!loading && userId && navigator.onLine) {
            processQueue().catch((err) => console.warn('[OfflineSyncManager] Initial queue processing failed:', err));
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('fap-sync-complete', handleSyncComplete);
        };
    }, [queryClient, userId, loading]);

    // Explicit retry right after login/session restore.
    useEffect(() => {
        if (!loading && userId && navigator.onLine) {
            processQueue().catch((err) => console.warn('[OfflineSyncManager] Post-login queue processing failed:', err));
        }
    }, [userId, loading]);

    return null; // Headless component
};

export default OfflineSyncManager;
