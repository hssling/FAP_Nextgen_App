import React, { useEffect } from 'react';
import { processQueue } from '../services/offlineQueue';
import { useQueryClient } from '@tanstack/react-query';

const OfflineSyncManager = () => {
    const queryClient = useQueryClient();

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
            console.log('[OfflineSyncManager] Online detected, processing queue...');
            processQueue();
        };

        window.addEventListener('online', handleOnline);

        // Attempt to process on mount if online
        if (navigator.onLine) {
            processQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('fap-sync-complete', handleSyncComplete);
        };
    }, [queryClient]);

    return null; // Headless component
};

export default OfflineSyncManager;
